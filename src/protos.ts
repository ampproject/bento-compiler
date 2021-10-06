export interface TreeProto {
  tree: [DocumentNodeProto];
  quirks_mode: undefined | boolean;
  root: number;
}

export interface DocumentNodeProto {
  tagid: 92; // See htmltagenum.ts
  children: Array<NodeProto>;
}

export type NodeProto = TextNodeProto | ElementNodeProto;

export interface TextNodeProto {
  value: string;
  num_terms: number;
}

export interface ElementNodeProto {
  tagid: number;
  value: string;
  attributes: Array<AttributeProto>;
  children: Array<NodeProto>;
}

export interface AttributeProto {
  name: string;
  value?: string;
}
