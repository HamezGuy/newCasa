import IParagonProperty from '@/types/IParagonProperty';

export default interface IParagonMedia {
  ClassName?: any;
  ImageHeight?: any;
  ImageWidth?: any;
  LongDescription?: any;
  MediaCategory?: any;
  MediaKey?: any;
  MediaURL?: string;
  ModificationTimestamp?: any;
  Order?: any;
  ResourceRecordID?: any;
  ResourceRecordKey?: any;
  ShortDescription?: any;
  Create_Dt?: any;
  Duration?: any;
  ListAgentEmail?: string;
  ListAgentPreferredPhone?: string;
}

export type ParagonPropertyWithMedia = IParagonProperty & {
  Media?: IParagonMedia[];
};
