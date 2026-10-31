package vn.dnahoangnguyen.api.settings;

/** Receiving bank account. {@code bin} is the 6-digit VietQR bank identification number. */
public record BankInfo(String bankName, String bin, String accountNo, String accountName) {
}
