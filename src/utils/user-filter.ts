import { ObjectId } from "mongodb";
export function userIdFilter(id:string){const alternatives:any[]=[{_id:id},{id}];if(ObjectId.isValid(id))alternatives.push({_id:new ObjectId(id)});return {$or:alternatives};}
export function userIdFilters(ids:string[]){return {$or:ids.flatMap(id=>{const items:any[]=[{_id:id},{id}];if(ObjectId.isValid(id))items.push({_id:new ObjectId(id)});return items;})};}
