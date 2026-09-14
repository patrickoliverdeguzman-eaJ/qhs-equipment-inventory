// utils.js
export const getInitials = (name?: string | null) => {
    if (!name) return ""; // Handle cases where name is undefined or null
    const names = name.split(" ");
    return names
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
