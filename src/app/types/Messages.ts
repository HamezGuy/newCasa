// src/app/types/types.ts
export interface Message {
  id: string;
  message: string;
  from: 'user' | 'realtor'; 
  clientId: string;
  propertyId: string; // to identify the property
  timestamp: string; // add timestamp for sorting
}
