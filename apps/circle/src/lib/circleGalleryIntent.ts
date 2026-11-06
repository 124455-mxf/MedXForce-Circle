export type CircleGalleryIntent =
  | {
      type: 'open-album';
      albumKind: 'reactions';
    }
  | {
      type: 'open-my-albums';
    };
