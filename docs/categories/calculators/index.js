import {category,entry,n,t,area,select,format,requireValue,randomNumber} from '../shared.js';
import {date,dateField,difference} from '../date-helpers.js';
import {compileExpression} from '../../calculator/expression.js';
import percentages from '../maths/percentages/index.js';
const percent=percentages.tools[0];
const currency=(name,label)=>n(name,label);
export default category('Calculators','/calculators','±','Run everyday, finance and date calculations.',[
 ['Everyday',[
  entry('Standard Calculator','Perform basic arithmetic.',[n('a','First number'),select('operation','Operation',['+','−','×','÷']),n('b','Second number')],({a,b,operation})=>{
    requireValue(operation!=='÷'||b!==0,'You cannot divide by zero.');
    return format({'+':()=>a+b,'−':()=>a-b,'×':()=>a*b,'÷':()=>a/b}[operation]());
  }),
  entry('Scientific Calculator','Evaluate expressions with powers and scientific functions.',[t('expression','Expression')],({expression})=>{
    requireValue(!/\bx\b|^\s*y\s*=/i.test(expression),'Enter a numeric expression without variables.');
    return format(compileExpression(expression)(NaN));
  },'Try sqrt(9), 2^8, sin(pi/2) or log(100). Trigonometry uses radians.'),percent]],
 ['Finance',[
  entry('VAT Calculator','Add or remove VAT using the rate you enter.',[currency('amount','Amount'),n('rate','VAT rate (%)'),select('mode','Action',['Add VAT','Remove VAT'])],({amount,rate,mode})=>{
    requireValue(amount>=0&&rate>=0,'Enter a non-negative amount and rate.');
    const net=mode==='Add VAT'?amount:amount/(1+rate/100);
    const gross=mode==='Add VAT'?amount*(1+rate/100):amount;
    return 'Net: '+format(net)+'\nVAT: '+format(gross-net)+'\nGross: '+format(gross);
  }),
  entry('Discount Calculator','Find the discounted price and savings.',[n('price','Original price'),n('rate','Discount (%)')],({price,rate})=>{
    requireValue(price>=0&&rate>=0&&rate<=100,'Enter a positive price and a discount from 0 to 100%.');
    return 'Price: '+format(price*(1-rate/100))+'\nSavings: '+format(price*rate/100);
  }),
  entry('Profit Margin Calculator','Find gross profit and margin from revenue and cost.',[n('revenue','Revenue'),n('cost','Cost')],({revenue,cost})=>{
    requireValue(revenue>0&&cost>=0,'Revenue must be positive and cost cannot be negative.');
    return 'Profit: '+format(revenue-cost)+'\nMargin: '+format((revenue-cost)/revenue*100)+'%';
  })]],
 ['Time',[difference,{...difference,name:'Days Between Dates Calculator'},
  entry('Age Calculator','Calculate age in completed years for a date.',[dateField('birth','Birth date'),dateField('asOf','Age on date')],({birth,asOf})=>{
    const start=date(birth),end=date(asOf);
    requireValue(end>=start,'The comparison date must be on or after the birth date.');
    return (end.getUTCFullYear()-start.getUTCFullYear()-Number(asOf.slice(-5)<birth.slice(-5)))+' years';
  })]],
 ['Other',[
  entry('Average Calculator','Find the arithmetic mean of a list.',[area('values','Numbers separated by commas, spaces or new lines')],({values})=>{
    const numbers=values.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    requireValue(numbers.length&&numbers.every(Number.isFinite),'Enter a list of valid numbers.');
    return format(numbers.reduce((sum,value)=>sum+value/numbers.length,0));
  }),
  entry('Ratio Calculator','Reduce a ratio of two non-negative whole numbers.',[t('a','First part'),t('b','Second part')],({a,b})=>{
    requireValue(/^\d+$/.test(a.trim())&&/^\d+$/.test(b.trim()),'Enter non-negative whole numbers.');
    const left=BigInt(a),right=BigInt(b);
    requireValue(left||right,'At least one part must be nonzero.');
    let x=left,y=right;
    while(y) [x,y]=[y,x%y];
    return left/x+' : '+right/x;
  }),randomNumber]]
]);
