
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight/lib/common';
import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface EditorProps {
    initialContent: any;
    onChange: (content: any) => void;
}

const Editor = ({ initialContent, onChange }: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            CodeBlockLowlight({
                lowlight,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert focus:outline-none max-w-full',
            },
        },
    });

    const debouncedOnChange = useDebouncedCallback((newContent) => {
        onChange(newContent);
    }, 1000);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => {
            debouncedOnChange(editor.getJSON());
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, debouncedOnChange]);


    useEffect(() => {
        if (editor && initialContent && !editor.isFocused) {
            // This is a bit of a hack to ensure the content is updated
            // when the component re-renders with new initialContent
            // without losing the cursor position if the user is typing.
            const { from, to } = editor.state.selection;
            editor.commands.setContent(initialContent, false);
            editor.commands.setTextSelection({ from, to });
        }
    }, [initialContent, editor]);


    if (!editor) {
        return null;
    }

    return (
        <div>
            <EditorContent editor={editor} />
        </div>
    );
};

export default Editor;
