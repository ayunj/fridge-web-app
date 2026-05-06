'use client';

import { useParams } from 'next/navigation';
import Modal from '@/components/Modal';
import IngredientEditor from '@/app/ingredients/_components/IngredientEditor';

export default function IngredientModalPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return (
    <Modal title="재료 상세 · 수정">
      <IngredientEditor id={id} closeOnSave />
    </Modal>
  );
}

