import { redirect } from 'react-router';
export function loader({request}:{request:Request}){
 const old=new URL(request.url),target=new URL(old.pathname.replace(/^\/admin/,''),'https://personal.nawah-project.com');
 for(const key of ['task','edition','page','book','note','map','goal','cycle','view','lang'])for(const value of old.searchParams.getAll(key))target.searchParams.append(key,value);
 return redirect(target.href,302);
}
export default function Moved(){return <a href="https://personal.nawah-project.com">افتح المساحة الشخصية / Open personal workspace</a>;}
