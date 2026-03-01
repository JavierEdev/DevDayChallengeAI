export interface IToolRecord {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface IToolSemanticMatch extends IToolRecord {
  datasetName: string;
  similarity: number;
}

export interface IToolDataset {
  name: string;
  description: string;
  records: IToolRecord[];
}

export interface IToolSemanticSearchInput {
  query: string;
  datasetName?: string;
  limit?: number;
}

export interface IToolRepository {
  listDatasets(): Promise<IToolDataset[]>;
  getDatasetByName(name: string): Promise<IToolDataset | null>;
  searchSimilarRecords(input: IToolSemanticSearchInput): Promise<IToolSemanticMatch[]>;
}
