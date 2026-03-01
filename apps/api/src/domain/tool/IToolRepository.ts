export interface IToolRecord {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface IToolDataset {
  name: string;
  description: string;
  records: IToolRecord[];
}

export interface IToolRepository {
  listDatasets(): Promise<IToolDataset[]>;
  getDatasetByName(name: string): Promise<IToolDataset | null>;
}
