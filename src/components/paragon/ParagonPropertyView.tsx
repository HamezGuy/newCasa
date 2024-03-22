import IParagonProperty from "@/types/IParagonProperty";
import DisplayUtils from "@/lib/utils/DisplayUtils";

interface IParagonPropertyViewProps {
    property: IParagonProperty;
}


export default function ParagonPropertyView(props: IParagonPropertyViewProps) {
    return (
        <div>
            <div><strong>Parcel Number:</strong> {props.property.ParcelNumber}</div>
            <div><strong>Listing Price:</strong> {DisplayUtils.formatCurrency(props.property.ListPrice)}</div>
            <div><strong>City:</strong> {props.property.City}</div>
            <hr />
        </div>
    );
}