type Props = {
  params: { id: string };
};

export default function DocumentEditorPage({ params }: Props) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Document Editor</h1>
      <p className="text-sm text-gray-500 mt-2">Editing document: {params.id}</p>
    </main>
  );
}

