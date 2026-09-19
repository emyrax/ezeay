import { Image } from "expo-image";
import { getAvatarUrl } from "../lib/dicebear";

interface CommunityAvatarProps {
  uid: string;
  photoURL?: string | null;
  size?: number;
}

export default function CommunityAvatar({ uid, photoURL, size = 44 }: CommunityAvatarProps) {
  return (
    <Image
      source={{ uri: photoURL || getAvatarUrl(uid) }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  );
}