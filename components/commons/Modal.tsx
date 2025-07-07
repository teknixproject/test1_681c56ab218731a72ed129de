'use client';

import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { useHandleData } from '@/hooks/useHandleData';
import { useUpdateData } from '@/hooks/useUpdateData';
import { GridItem } from '@/types/gridItem';

import { RenderSlice } from '../grid-systems';

interface ModalProps {
  data: any;
  [key: string]: unknown;
}

const Modal = ({ data, ...props }: ModalProps) => {
  const { dataState } = useHandleData({ dataProp: data?.data });

  const { updateData } = useUpdateData({ dataProp: data?.data });

  console.log('ModalModal', Modal);

  return (
    <Dialog open={dataState} onOpenChange={updateData}>
      <DialogOverlay />
      <DialogContent
        style={{
          ...data?.style,
        }}
        {...props}
      >
        {data?.childs?.map((item: GridItem) => (
          <RenderSlice slice={item} key={item.id} />
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
