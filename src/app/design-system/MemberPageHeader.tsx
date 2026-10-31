import type { ReactNode } from "react";
export function MemberPageHeader({eyebrow,title,description,icon,actions}: {eyebrow:string;title:string;description:string;icon?:ReactNode;actions?:ReactNode}) {
 return <header className="n-page-header"><div className="n-page-header-copy"><span className="n-eyebrow">{icon}{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="n-page-actions">{actions}</div>}</header>;
}
