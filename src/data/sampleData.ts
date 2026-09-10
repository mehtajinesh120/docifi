import { Question, AnswerImage } from "../types";

// Canvas helper to generate sample coding answer screenshots
function generateSampleScreenshot(title: string, codeLines: string[], theme: "dark" | "terminal"): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Background
  ctx.fillStyle = theme === "dark" ? "#1e1e2e" : "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Window Title Bar
  ctx.fillStyle = theme === "dark" ? "#181825" : "#020617";
  ctx.fillRect(0, 0, canvas.width, 36);

  // Window buttons
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(20, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.arc(38, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(56, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(title, 80, 23);

  // Line numbers & code
  ctx.font = "16px 'JetBrains Mono', monospace";
  let y = 70;
  codeLines.forEach((line, idx) => {
    ctx.fillStyle = "#475569";
    ctx.fillText(String(idx + 1).padStart(2, "0"), 24, y);

    if (line.includes("printf") || line.includes("cout") || line.includes("print(")) {
      ctx.fillStyle = "#38bdf8";
    } else if (line.includes("#include") || line.includes("import") || line.includes("def ") || line.includes("int ") || line.includes("void ")) {
      ctx.fillStyle = "#c084fc";
    } else if (line.includes("//") || line.includes("#")) {
      ctx.fillStyle = "#64748b";
    } else if (line.includes("OUTPUT:") || line.includes("$ ")) {
      ctx.fillStyle = "#4ade80";
    } else {
      ctx.fillStyle = "#f1f5f9";
    }

    ctx.fillText(line, 64, y);
    y += 26;
  });

  return canvas.toDataURL("image/png");
}

export function getSampleAssignment(): {
  topic: string;
  questions: Question[];
  images: AnswerImage[];
} {
  const q1Img = generateSampleScreenshot(
    "q1_linked_list_reverse.c",
    [
      "// Question 1: Reverse a Singly Linked List",
      "#include <stdio.h>",
      "#include <stdlib.h>",
      "",
      "struct Node { int data; struct Node* next; };",
      "",
      "struct Node* reverseList(struct Node* head) {",
      "    struct Node *prev = NULL, *curr = head, *next = NULL;",
      "    while (curr != NULL) {",
      "        next = curr->next;",
      "        curr->next = prev;",
      "        prev = curr;",
      "        curr = next;",
      "    }",
      "    return prev; // new head",
      "}",
      "",
      "$ gcc q1.c -o q1 && ./q1",
      "OUTPUT: Original List: 10 -> 20 -> 30 -> 40 -> NULL",
      "OUTPUT: Reversed List: 40 -> 30 -> 20 -> 10 -> NULL",
    ],
    "dark"
  );

  const q2Img = generateSampleScreenshot(
    "q2_quick_sort.py",
    [
      "# Question 2: QuickSort Implementation with Partitioning",
      "def partition(arr, low, high):",
      "    pivot = arr[high]",
      "    i = low - 1",
      "    for j in range(low, high):",
      "        if arr[j] <= pivot:",
      "            i += 1",
      "            arr[i], arr[j] = arr[j], arr[i]",
      "    arr[i + 1], arr[high] = arr[high], arr[i + 1]",
      "    return i + 1",
      "",
      "def quicksort(arr, low, high):",
      "    if low < high:",
      "        pi = partition(arr, low, high)",
      "        quicksort(arr, low, pi - 1)",
      "        quicksort(arr, pi + 1, high)",
      "",
      "$ python3 q2_quick_sort.py",
      "OUTPUT: Input Array: [64, 34, 25, 12, 22, 11, 90]",
      "OUTPUT: Sorted Array: [11, 12, 22, 25, 34, 64, 90]",
    ],
    "dark"
  );

  const q3Img = generateSampleScreenshot(
    "terminal_assembly_8086.asm",
    [
      "; Question 3: 8086 Assembly Program for Array Sum",
      "DATA SEGMENT",
      "    ARR DB 12H, 34H, 56H, 78H, 9AH",
      "    LEN EQU ($-ARR)",
      "    SUM DW 0000H",
      "DATA ENDS",
      "",
      "CODE SEGMENT",
      "    ASSUME CS:CODE, DS:DATA",
      "START:",
      "    MOV AX, DATA",
      "    MOV DS, AX",
      "    MOV SI, OFFSET ARR",
      "    MOV CX, LEN",
      "    XOR AX, AX",
      "L1: ADD AL, [SI]",
      "    ADC AH, 0",
      "    INC SI",
      "    LOOP L1",
      "    MOV SUM, AX",
      "OUTPUT: Execution completed. AX (Sum) = 01B8H",
    ],
    "terminal"
  );

  return {
    topic: "Computer Science Lab 3: Data Structures & Algorithms",
    questions: [
      {
        id: "q1",
        number: "1",
        question: "Write a C program to reverse a singly linked list in-place and demonstrate with sample terminal output.",
        context: "C code with pointer manipulation and terminal output",
      },
      {
        id: "q2",
        number: "2",
        question: "Implement the QuickSort algorithm in Python using Lomuto partitioning and display sorted array output.",
        context: "Python quicksort function and test output",
      },
      {
        id: "q3",
        number: "3",
        question: "Write an 8086 Assembly language program to calculate the sum of an array of 5 bytes and store the result in memory.",
        context: "8086 Assembly segment with loop and ADC",
      },
      {
        id: "q4",
        number: "4",
        question: "Analyze the time and space complexity of Dijkstra's Single Source Shortest Path algorithm using a Min-Heap.",
        context: "Theoretical complexity analysis with big-O notation",
      },
    ],
    images: [
      {
        id: "sample_img_1",
        name: "linked_list_reverse_c.png",
        source: "file",
        base64: q1Img,
        mimeType: "image/png",
        matchedQuestionId: "q1",
        confidence: 0.98,
        rationale: "Shows C code implementing reverseList() with struct Node pointers and terminal output.",
      },
      {
        id: "sample_img_2",
        name: "quicksort_lomuto_python.png",
        source: "file",
        base64: q2Img,
        mimeType: "image/png",
        matchedQuestionId: "q2",
        confidence: 0.99,
        rationale: "Python function partition and quicksort sorting [64, 34, 25, 12, 22, 11, 90].",
      },
      {
        id: "sample_img_3",
        name: "assembly_8086_array_sum.png",
        source: "file",
        base64: q3Img,
        mimeType: "image/png",
        matchedQuestionId: "q3",
        confidence: 0.97,
        rationale: "8086 assembly program calculating sum of ARR DB bytes with LOOP L1.",
      },
    ],
  };
}
