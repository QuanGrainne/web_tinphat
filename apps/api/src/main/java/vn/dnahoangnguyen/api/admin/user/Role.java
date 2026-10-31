package vn.dnahoangnguyen.api.admin.user;

public enum Role {
    EDITOR,
    MANAGER;

    /** Spring Security authority string for this role. */
    public String authority() {
        return "ROLE_" + name();
    }
}
