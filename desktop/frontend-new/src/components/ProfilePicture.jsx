const ProfilePicture = ({ alt = "Image", src = null }) => {
  const placeholder = "/avatar-placeholder.png";

  return (
    <img
      alt={alt}
      className="h-10 w-10 rounded-full object-cover ring-1 ring-white dark:ring-slate-700 shadow-sm"
      // Use the src provided, or the placeholder if src is null/empty
      src={src || placeholder}
      onError={(e) => {
        // If the URL was 'available' but 'not found' (404), 
        // we replace it with the placeholder.
        if (e.target.src !== placeholder) {
          e.target.src = placeholder;
        }
      }}
    />
  );
};

export default ProfilePicture;