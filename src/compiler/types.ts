export interface Annotation {
  note: string;
}

export interface ACL {
  roles?: string[];
  conditions?: string[];
  annotation?: Annotation;
}

export interface Resource {
  name: string;
  purpose?: string;
  annotation?: Annotation;
}

export interface Actor {
  name: string;
  annotation?: Annotation;
}

export interface Component {
  name: string;
  type: string;
  annotation?: Annotation;
  acl?: ACL;
}

export interface View {
  name: string;
  components?: Component[];
  annotation?: Annotation;
  acl?: ACL;
}

export interface Trigger {
  component: string;
  on: 'submit' | 'click' | 'change';
}

export interface Param {
  name: string;
  from: string;
}

export interface Path {
  from: string;
  to: string;
  actors?: string[];
  trigger?: Trigger;
  params?: Param[];
  annotation?: Annotation;
  acl?: ACL;
}

export interface UI {
  name: string;
  resources?: Resource[] | Record<string, Resource>;
  actors?: Actor[] | Record<string, Actor>;
  views?: View[];
  paths?: Path[];
  acl?: ACL;
}
