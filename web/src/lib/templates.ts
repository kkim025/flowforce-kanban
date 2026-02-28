export interface ChecklistTemplate {
    title: string;
    items: string[];
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
    {
        title: "Definition of Done",
        items: [
            "Code reviewed by peer",
            "Unit tests passed",
            "Documentation updated",
            "QA validation completed",
            "Merged to main branch"
        ]
    },
    {
        title: "QA Checklist",
        items: [
            "UI matches design specs",
            "Cross-browser testing passed",
            "Mobile responsiveness verified",
            "Edge cases handled",
            "No console errors"
        ]
    },
    {
        title: "Feature Launch",
        items: [
            "Analytics tracking implemented",
            "Feature toggle enabled",
            "Marketing copy approved",
            "Support team notified",
            "Post-launch monitoring active"
        ]
    },
    {
        title: "Security Audit",
        items: [
            "Input validation verified",
            "Authentication check implemented",
            "Sensitive data encrypted",
            "CSRF/XSS protections active",
            "Dependency vulnerabilities checked"
        ]
    }
];
