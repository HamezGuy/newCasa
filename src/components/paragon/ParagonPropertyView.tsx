import IParagonProperty from "@/types/IParagonProperty";

interface IParagonPropertyViewProps {
    property: IParagonProperty;
}


export default function ParagonPropertyView(props: IParagonPropertyViewProps) {
    return (
        <div>
            <div>Parcel Number: {props.property.ParcelNumber}</div>
            <div>Listing Price: {props.property.ListPrice}</div>
            <div>City: {props.property.City}</div>
            <hr />
        </div>
    );
}