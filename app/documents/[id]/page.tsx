type Props = { params: Promise<{ id: string }> };

import EditorClient from "./client";

export default async function DocumentEditorPage({ params }: Props) {
  const { id } = await params;
  return <EditorClient id={id} />;
}
