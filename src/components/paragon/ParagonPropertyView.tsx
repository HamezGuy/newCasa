import IParagonProperty from "@/types/IParagonProperty";
import DisplayUtils from "@/lib/utils/DisplayUtils";
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';

interface IParagonPropertyViewProps {
    property: ParagonPropertyWithMedia;
}


export default function ParagonPropertyView(props: IParagonPropertyViewProps) {
    return (
        <div>
            <div><strong>Parcel Number:</strong> {props.property.ParcelNumber}</div>
            <div><strong>Listing Price:</strong> {DisplayUtils.formatCurrency(props.property.ListPrice)}</div>
            <div><strong>City:</strong> {props.property.City}</div>
            {props.property.Media?.[0].MediaURL && <div><img src={props.property.Media?.[0].MediaURL} alt="Test" /></div>}
          <hr />
        </div>
    );
}