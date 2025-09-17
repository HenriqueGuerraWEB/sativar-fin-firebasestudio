
'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface EditorProps {
    initialContent: any;
    onChange: (content: any) => void;
}

const EditorToolbar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-1 rounded-md bg-zinc-800 p-1"
        >
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('heading', { level: 1 }) ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Heading1 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('heading', { level: 2 }) ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Heading2 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('heading', { level: 3 }) ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Heading3 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('bold') ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('italic') ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                 className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('strike') ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Strikethrough className="h-4 w-4" />
            </Button>
             <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCode().run()}
                 className={cn(
                    "p-2 h-auto text-white hover:bg-zinc-700 hover:text-white",
                    editor.isActive('code') ? 'is-active bg-zinc-700' : ''
                )}
            >
                <Code className="h-4 w-4" />
            </Button>
        </BubbleMenu>
    );
};


const Editor = ({ initialContent, onChange }: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
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
            // Using a deep check to avoid re-rendering if content is the same
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) {
                const { from, to } = editor.state.selection;
                editor.commands.setContent(initialContent, false);
                editor.commands.setTextSelection({ from, to });
            }
        }
    }, [initialContent, editor]);


    if (!editor) {
        return null;
    }

    return (
        <div className="relative">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};

export default Editor;
