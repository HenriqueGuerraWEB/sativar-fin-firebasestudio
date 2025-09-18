
import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    anchor: {
      setAnchor: (attributes: { id: string }) => ReturnType;
      toggleAnchor: () => ReturnType;
      unsetAnchor: () => ReturnType;
    };
  }
}

export const AnchorMark = Mark.create({
  name: 'anchor',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[id]',
        getAttrs: (node) => (node as HTMLElement).getAttribute('id') ? {} : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setAnchor: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleAnchor: () => ({ commands }) => {
        return commands.toggleMark(this.name);
      },
      unsetAnchor: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
