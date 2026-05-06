import { redirect } from 'next/navigation';

export default async function LegacyIngredientRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ingredients/item/${encodeURIComponent(id)}`);
}

