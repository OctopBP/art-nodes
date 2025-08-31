type Props = {
  params: Promise<{ id: string }>;
};

export default async function DocumentEditorPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Document Editor</h1>
      <p className="text-sm text-gray-500 mt-2">Editing document: {id}</p>
    </main>
  );
}
