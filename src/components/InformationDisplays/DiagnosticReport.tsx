import React from 'react';
import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Code, Heading, Table, Tbody, Td, Text, Tr } from '@chakra-ui/react';
import { diagnosticSections, diagnosticText, parseDiagnostic } from 'helpers/diagnosticReport';

const DiagnosticReport = ({ value, rawValue }: { value: unknown; rawValue?: unknown }) => {
  const parsed = React.useMemo(() => parseDiagnostic(value), [value]);
  const sections = React.useMemo(() => diagnosticSections(parsed), [parsed]);
  const raw = React.useMemo(() => {
    const original = rawValue === undefined ? value : rawValue;
    return typeof original === 'string' ? original : JSON.stringify(original, null, 2);
  }, [value, rawValue]);
  return <Box mt={3}>
    {sections.length ? sections.map((section, index) => <Box key={index} mb={4}>
      <Heading size="sm" mb={2}>{section.title}</Heading>
      <Table size="sm"><Tbody>{section.rows.map((row, rowIndex) => <Tr key={rowIndex}>
        <Td width="35%" verticalAlign="top"><Text fontWeight="medium">{row.label}</Text></Td>
        <Td whiteSpace="pre-wrap" overflowWrap="anywhere">{row.value}</Td>
      </Tr>)}</Tbody></Table>
    </Box>) : <Code display="block" whiteSpace="pre-wrap" overflowWrap="anywhere">{diagnosticText(parsed)}</Code>}
    <Accordion allowToggle mt={3}>
      <AccordionItem><AccordionButton><Box flex="1" textAlign="left">Raw JSON / original data</Box><AccordionIcon /></AccordionButton>
        <AccordionPanel maxH="500px" overflow="auto"><Code as="pre" display="block" whiteSpace="pre-wrap" overflowWrap="anywhere">{raw ?? 'Not reported'}</Code></AccordionPanel>
      </AccordionItem>
    </Accordion>
  </Box>;
};

export default React.memo(DiagnosticReport);
