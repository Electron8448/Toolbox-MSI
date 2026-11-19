import {category,entry,field,n,select,integer,requireValue,format} from '../shared.js';
const file=field('file','Image file','file',{accept:'image/*'});
const types={PNG:'image/png',JPG:'image/jpeg',WebP:'image/webp'};
function canvasFor(width,height) {
  integer(width,1,8192); integer(height,1,8192);
  requireValue(width*height<=32000000,'Use an image below 32 megapixels.');
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  return canvas;
}
async function read(file,process) {
  requireValue(file && file.size<=40000000,'Choose an image under 40 MB.');
  let bitmap;
  try { bitmap=await createImageBitmap(file); } catch { throw new Error('This image could not be decoded. Try PNG, JPEG or WebP.'); }
  try { return await process(bitmap,file); } finally { bitmap.close(); }
}
function raster(image,w,h,type,draw) {
  const canvas=canvasFor(w,h),ctx=canvas.getContext('2d');
  if(type==='image/jpeg') {ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  draw(ctx,image);
  return canvas;
}
async function download(canvas,type,quality=.92) {
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  requireValue(blob&&blob.type===type,'This browser cannot export the selected format.');
  const extension=type==='image/jpeg'?'jpg':type.split('/')[1];
  return {blob,filename:'toolbox-image.'+extension,text:canvas.width+' × '+canvas.height+' px\n'+format(blob.size/1000)+' KB'};
}
const transform=(name,description,fields,apply,note)=>entry(name,description,[file,...fields],values=>read(values.file,(image,file)=>apply(image,values,file)),note);
const convert=(name,type)=>transform(name,'Convert your image locally and download it.',[],image=>download(raster(image,image.width,image.height,type,(ctx,image)=>ctx.drawImage(image,0,0)),type));
const png='image/png';
export default category('Image Tools','/image-tools','▧','Convert, edit and inspect images in your browser.',[
 ['Conversion',[convert('PNG to JPG Converter',types.JPG),convert('JPG to PNG Converter',png),convert('WebP Converter',types.WebP)]],
 ['Editing',[
  transform('Image Resizer','Resize to exact pixel dimensions.',[n('width','New width'),n('height','New height')],(image,{width,height})=>download(raster(image,width,height,png,(ctx,image)=>ctx.drawImage(image,0,0,width,height)),png)),
  transform('Image Cropper','Crop a rectangle using pixel coordinates from the top left.',[n('x','Left',{value:0}),n('y','Top',{value:0}),n('width','Width'),n('height','Height')],(image,{x,y,width,height})=>{
    integer(x,0,image.width-1);integer(y,0,image.height-1);
    requireValue(x+width<=image.width&&y+height<=image.height,'The crop must fit inside the image.');
    return download(raster(image,width,height,png,(ctx,image)=>ctx.drawImage(image,x,y,width,height,0,0,width,height)),png);
  }),
  transform('Image Rotator','Rotate an image clockwise.',[select('angle','Angle',['90','180','270'])],(image,{angle})=>{
    const width=angle==='180'?image.width:image.height,height=angle==='180'?image.height:image.width;
    return download(raster(image,width,height,png,(ctx,image)=>{ctx.translate(width/2,height/2);ctx.rotate(Number(angle)*Math.PI/180);ctx.drawImage(image,-image.width/2,-image.height/2);}),png);
  })]],
 ['Optimisation',[
  transform('Image Compressor','Re-encode an image and compare output size.',[select('format','Output format',['WebP','JPG']),n('quality','Quality from 1 to 100',{value:75})],async(image,{format:target,quality},original)=>{
    const type=types[target];
    const result=await download(raster(image,image.width,image.height,type,(ctx,image)=>ctx.drawImage(image,0,0)),type,integer(quality,1,100)/100);
    return {...result,text:result.text+' saved\nOriginal: '+format(original.size/1000)+' KB'};
  }),
  transform('Image Dimension Checker','Read the dimensions and aspect ratio.',[],image=>image.width+' × '+image.height+' px\nAspect ratio: '+format(image.width/image.height)+':1')]],
 ['Other',[
  transform('Colour Extractor','Extract up to five common colours from nontransparent pixels.',[],image=>{
    const scale=Math.min(1,160/Math.max(image.width,image.height));
    const canvas=canvasFor(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,counts=new Map();
    for(let i=0;i<pixels.length;i+=4) {
      if(pixels[i+3]<128) continue;
      const key='#'+[pixels[i],pixels[i+1],pixels[i+2]].map(value=>(Math.round(value/17)*17).toString(16).padStart(2,'0')).join('').toUpperCase();
      counts.set(key,(counts.get(key)??0)+1);
    }
    const colours=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5).map(pair=>pair[0]);
    requireValue(colours.length,'The image has no sufficiently opaque pixels.');return {text:colours.join('\n'),colours};
  }),
  transform('Image Metadata Viewer','Inspect file details and available camera metadata.',[],async(image,_,file)=>{
    const basic=['Name: '+file.name,'Type: '+(file.type||'Unknown'),'Bytes: '+file.size,
      'Dimensions: '+image.width+' × '+image.height,'Last modified: '+new Date(file.lastModified).toLocaleString()];
    const {parse}=await import('../../vendor/exifr.mjs');
    let camera;
    try {camera=await parse(file,{gps:true,tiff:true,exif:true});} catch {}
    for(const key of ['Make','Model','LensModel','DateTimeOriginal','ExposureTime','FNumber','ISO','FocalLength','Orientation','latitude','longitude']){
      if(camera?.[key]!==undefined)basic.push(key+': '+String(camera[key]));
    }
    if(basic.length===5)basic.push('No supported camera tags found.');
    return basic.join('\n');
  },'File contents and location tags are processed locally in your browser.')
 ]]
]);
