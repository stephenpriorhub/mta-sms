"use client";

import { useParams } from "next/navigation";
import PostEditor from "@/components/admin/PostEditor";

export default function NewPost() {
  const { id } = useParams<{ id: string }>();
  return <PostEditor listId={id} />;
}
