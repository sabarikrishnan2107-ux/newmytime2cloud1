export const handleToggle = (id) => {
    setFormData(prev => ({
        ...prev,
        modules: {
            ...prev.modules,
            [id]: !prev.modules[id],
        },
    }));
};

export const handlePermissionChange = (moduleKey, subModuleId, permissionKey, isChecked) => {
    setFormData(prev => ({
        ...prev,
        permissions: {
            ...prev.permissions,
            [moduleKey]: {
                ...prev.permissions[moduleKey],
                [subModuleId]: {
                    ...prev.permissions[moduleKey]?.[subModuleId],
                    [permissionKey]: !!isChecked
                }
            }
        }
    }));
};

export const handleToggleRow = (moduleKey, subModuleId, isChecked) => {
    const rowPermissions = {};
    PERMISSION_TYPES.forEach(perm => {
        rowPermissions[perm.key] = !!isChecked;
    });

    setFormData(prev => ({
        ...prev,
        permissions: {
            ...prev.permissions,
            [moduleKey]: {
                ...prev.permissions[moduleKey],
                [subModuleId]: rowPermissions
            }
        }
    }));
};