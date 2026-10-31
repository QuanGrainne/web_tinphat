package vn.dnahoangnguyen.api.settings;

import java.util.List;

public record AdminSettings(CompanyInfo company, BankInfo bank, String notifyOwnerEmail,
                            double pricingMismatchThresholdPct, List<DiscountTier> discountTiers) {
}
