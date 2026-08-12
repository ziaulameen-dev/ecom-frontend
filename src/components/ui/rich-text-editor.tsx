'use client';

import LinkExt from '@tiptap/extension-link';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold, Heading2, Heading3, Italic, Link as LinkIcon,
  List, ListOrdered, Redo2, Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Btn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded transition-colors hover:bg-accent disabled:opacity-40',
        active && 'bg-accent text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
      <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Btn>
      <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn
        title="Link"
        active={editor.isActive('link')}
        onClick={() => {
          if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
      ><LinkIcon className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Btn>
    </div>
  );
}

/** WYSIWYG editor that emits sanitized-later HTML. Supports {variables} as plain text. */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false, // avoid Next SSR hydration mismatch
    extensions: [
      StarterKit,
      LinkExt.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'richtext min-h-32 px-3 py-2 text-sm focus:outline-none',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-md border">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
