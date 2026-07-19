"use client";

import { useParams } from "next/navigation";
import PostEditor from "@/components/admin/PostEditor";

export default function EditPost() {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  return <PostEditor listId={id} postId={postId} />;
}
