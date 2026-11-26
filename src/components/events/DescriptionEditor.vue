<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mdiFormatBold, mdiFormatListBulleted } from '@mdi/js'
import Button from 'primevue/button'
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    rules?: readonly ((v: any) => boolean | string)[]
  }>(),
  { label: '' }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isFocused = ref(false)
const lastEmitted = ref(props.modelValue || '')

// PrimeVue has no rule evaluation, so the Vuetify v-input rules wrapper is
// reproduced manually: the first failing rule message drives the error style.
const error = computed(() => {
  for (const rule of props.rules ?? []) {
    const result = rule(props.modelValue)
    if (result !== true) {
      return result
    }
  }
  return undefined
})

function tiptapToStored(html: string): string {
  let result = html
  result = result.replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>')
  result = result.replace(/<p(?:\s[^>]*)?>/g, '').replace(/<\/p>/g, '<br>')
  result = result.replace(/(?:<br\s*\/?>\s*)+<\/li>/g, '</li>')
  result = result.replace(/<\/ul>(?!\s*<br\s*\/?>)/g, '</ul><br>')
  result = result.replace(/(?:<br\s*\/?>\s*){2,}(?=<ul)/g, '<br>')
  result = result.replace(/(?:<br\s*\/?>\s*)+$/, '')
  return result.trim()
}

function storedToTiptapInline(text: string): string {
  if (!text || !text.trim()) return ''
  let result = text
    .trim()
    .replace(/^(<br\s*\/?>)+/, '')
    .replace(/(<br\s*\/?>)+$/, '')
  if (!result) return ''
  result = result.replace(/<br\s*\/?>/g, '</p><p>')
  return '<p>' + result + '</p>'
}

function storedToTiptap(html: string): string {
  if (!html) return ''
  const result = html.trim()
  const parts: string[] = []
  let lastIndex = 0
  const ulRegex = /<ul[\s\S]*?<\/ul>/g
  let match: RegExpExecArray | null
  while ((match = ulRegex.exec(result)) !== null) {
    if (match.index > lastIndex) {
      parts.push(storedToTiptapInline(result.slice(lastIndex, match.index)))
    }
    parts.push(match[0])
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < result.length) {
    parts.push(storedToTiptapInline(result.slice(lastIndex)))
  }
  return parts.join('')
}

const editor = useEditor({
  content: storedToTiptap(props.modelValue || ''),
  extensions: [
    StarterKit.configure({
      heading: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      italic: false,
      strike: false,
      orderedList: false,
      horizontalRule: false,
      link: false,
      underline: false
    })
  ],
  onUpdate: ({ editor: ed }) => {
    const html = tiptapToStored(ed.getHTML())
    lastEmitted.value = html
    emit('update:modelValue', html)
  },
  onFocus: () => {
    isFocused.value = true
  },
  onBlur: () => {
    isFocused.value = false
  }
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== lastEmitted.value) {
      editor.value.commands.setContent(storedToTiptap(newValue || ''), { emitUpdate: false })
      lastEmitted.value = newValue
    }
  }
)
</script>

<template>
  <div class="description-editor" :class="{ 'description-editor--error': error !== undefined }">
    <div
      class="description-editor__field"
      :class="{ 'description-editor__field--focused': isFocused }"
    >
      <label
        v-if="label"
        class="description-editor__label"
        :class="{ 'description-editor__label--focused': isFocused }"
      >
        {{ label }}
      </label>
      <div v-if="editor" class="description-editor__toolbar">
        <Button
          text
          rounded
          aria-label="Fett"
          :severity="editor.isActive('bold') ? 'primary' : 'secondary'"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <MdiIcon :path="mdiFormatBold" :size="20" />
        </Button>
        <Button
          text
          rounded
          aria-label="Liste"
          :severity="editor.isActive('bulletList') ? 'primary' : 'secondary'"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <MdiIcon :path="mdiFormatListBulleted" :size="20" />
        </Button>
      </div>
      <EditorContent v-if="editor" :editor="editor" class="description-editor__content" />
    </div>
    <div v-if="error" class="description-editor__error">{{ error }}</div>
  </div>
</template>

<style>
.description-editor {
  width: 100%;
}

.description-editor__field {
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  width: 100%;
  transition: border-color 0.2s ease;
}

.description-editor__field--focused {
  border-color: rgba(0, 0, 0, 0.87);
}

.description-editor--error .description-editor__field {
  border-color: var(--p-red-500, #f44336);
}

.description-editor__label {
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 6px 12px 2px;
  color: rgba(0, 0, 0, 0.6);
  transition: color 0.2s ease;
}

.description-editor__label--focused {
  color: rgba(0, 0, 0, 0.87);
}

.description-editor--error .description-editor__label {
  color: var(--p-red-500, #f44336);
}

.description-editor__error {
  color: var(--p-red-500, #f44336);
  font-size: 0.75rem;
  padding: 2px 12px 0;
}

.description-editor__toolbar {
  display: flex;
  gap: 2px;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.description-editor__content {
  padding: 8px 12px;
}

.description-editor__content .ProseMirror {
  outline: none;
  min-height: 160px;
}

.description-editor__content .ProseMirror p {
  margin: 0;
}

.description-editor__content .ProseMirror ul {
  margin: 0.5em 0;
  padding-left: 1.5em;
  list-style-type: disc;
}

.description-editor__content .ProseMirror li {
  margin: 0.25em 0;
}

.description-editor__content .ProseMirror b {
  font-weight: bold;
}
</style>
