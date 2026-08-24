import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

function ToolbarButton({ active, onClick, label, title }) {
  return (
    <button
      type="button"
      className={'rte-btn' + (active ? ' active' : '')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || 'Write your post content here...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // If the parent resets `value` to empty (e.g. after a successful publish),
  // clear the editor too — it doesn't otherwise re-sync from `value` on
  // every keystroke (that would fight the user's cursor).
  useEffect(() => {
    if (!editor) return;
    if (value === '' && editor.getText().trim() !== '') {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <ToolbarButton
          label={<b>B</b>}
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label={<i>I</i>}
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label={<s>S</s>}
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <span className="rte-divider" />
        <ToolbarButton
          label="• List"
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. List"
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="&ldquo;"
          title="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <span className="rte-divider" />
        <ToolbarButton
          label="🔗"
          title="Add link"
          active={editor.isActive('link')}
          onClick={setLink}
        />
        <span className="rte-divider" />
        <ToolbarButton
          label="↺"
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="↻"
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
