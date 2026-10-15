import React from 'react';
export function Dice({value=6, rolling=false}) {
  const patterns = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  return <div className={`wp-dice ${rolling?'wp-dice-rolling':''}`} role="img" aria-label={rolling?'Dice rolling':`Dice: ${value}`}><div>{Array.from({length:9},(_,index)=><i key={index} className={patterns[value]?.includes(index)?'is-pip':''}/>)}</div></div>;
}

