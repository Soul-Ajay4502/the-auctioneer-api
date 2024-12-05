const toCamelCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(toCamelCase); // Recursively handle arrays
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelCaseKey] = toCamelCase(obj[key]); // Recursively handle nested objects
            return acc;
        }, {});
    }
    return obj; // Return the value if it's not an object or array
};

module.exports = toCamelCase;