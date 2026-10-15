import React,{createContext,useContext} from 'react';
import {createPortal} from 'react-dom';

// Existing classroom views render controls in place. The assignment screen
// supplies a dock so every question type shares the same visible action area.
export const QuestionActionTarget=createContext(null);
export function QuestionActions({children}){
 const target=useContext(QuestionActionTarget);
 return target?createPortal(children,target):children;
}
