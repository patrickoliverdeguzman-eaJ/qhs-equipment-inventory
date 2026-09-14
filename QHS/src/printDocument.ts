import DOMPurify from 'dompurify';

export function writePrintDocument(printWindow: Window | null, html: string) {
  if (!printWindow) return false;

  printWindow.opener = null;
  const sanitized = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style'],
  });

  printWindow.document.open();
  printWindow.document.write(sanitized);
  printWindow.document.close();

  return true;
}
