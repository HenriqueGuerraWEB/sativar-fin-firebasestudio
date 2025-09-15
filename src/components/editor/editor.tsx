
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { useEffect } from 'react';

const lowlight = createLowlight(common);

interface EditorProps {
    initialContent: any;
    onChange: (content: any) => void;
}

const Editor = ({ initialContent, onChange }: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            CodeBlockLowlight.configure({
                lowlight,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert focus:outline-none max-w-full',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
    });

    useEffect(() => {
        if (editor && initialContent && !editor.isFocused) {
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

    