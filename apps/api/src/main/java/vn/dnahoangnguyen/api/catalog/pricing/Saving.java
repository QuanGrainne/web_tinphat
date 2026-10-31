package vn.dnahoangnguyen.api.catalog.pricing;

/** {@code pct} is set for PERCENT (and 0.0 for EQUAL); NONE carries no percentage. */
public record Saving(SavingKind kind, Double pct) {

    public static final Saving NONE = new Saving(SavingKind.NONE, null);
}
