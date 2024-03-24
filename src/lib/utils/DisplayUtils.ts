export default class DisplayUtils {
    public static formatCurrency(value?: number): string {
        if (!value) { return ""; }
        return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    }
}