import React, {useEffect,useState} from 'react';
import {courseName} from './course-name.mjs';

export function CourseName({value='',onSave,onCancel,create=false}) {
  const [name,setName]=useState(value),[error,setError]=useState('');
  useEffect(()=>{setName(value);setError('');},[value]);
  const dirty=name!==value;
  return <form className="lh-course-name" onSubmit={e=>{
    e.preventDefault();try{const normalized=courseName(name);onSave(normalized);setName(normalized);setError('');}catch(err){setError(err.message);}
  }}>
    <label>課程名稱
      <input aria-label={create?'新課程名稱':'課程名稱'} value={name} maxLength={200} required placeholder="例如：五年級 Unit 2 交通工具" onChange={e=>setName(e.target.value)}/>
    </label>
    <button className="lh-primary" disabled={!name.trim()||(!create&&!dirty)}>{create?'建立並開始備課':'儲存名稱'}</button>
    {onCancel&&<button type="button" onClick={onCancel}>取消</button>}
    <small role="status">{error||`${name.length} / 200 字元${!create&&dirty?' · 名稱尚未套用，請按「儲存名稱」':''}`}</small>
  </form>;
}
