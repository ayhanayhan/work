'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from 'lucide-react';

export function TicartiRichTextEditor({
  initialValue = '<p>Metninizi buraya yazın...</p>',
  minHeight = 220,
  onChange,
}: {
  initialValue?: string;
  minHeight?: number;
  onChange?: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialValue) {
      ref.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  const emit = () => onChange?.(ref.current?.innerHTML ?? '');
  const run = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  };
  const addLink = () => {
    const url = window.prompt('Bağlantı adresi');
    if (url) run('createLink', url);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('formatBlock', 'h2')} title="Başlık"><Heading2 /></Button>
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('bold')} title="Kalın"><Bold /></Button>
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('italic')} title="İtalik"><Italic /></Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('insertUnorderedList')} title="Liste"><List /></Button>
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('insertOrderedList')} title="Numaralı liste"><ListOrdered /></Button>
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={addLink} title="Bağlantı"><Link2 /></Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('undo')} title="Geri al"><Undo2 /></Button>
        <Button type="button" mode="icon" size="sm" variant="ghost" onClick={() => run('redo')} title="İleri al"><Redo2 /></Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight }}
        className="p-5 text-sm leading-7 outline-none"
        onInput={emit}
      />
    </div>
  );
}
