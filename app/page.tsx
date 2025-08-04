"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  Download,
  Sun,
  Moon,
  Key,
  RotateCw,
  Plus,
  Trash2,
  FileText,
  HelpCircle,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Helper function to convert a string to an ArrayBuffer
const strToArrayBuffer = (str) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};

// Helper function to convert an ArrayBuffer to a string
const arrayBufferToStr = (buffer) => {
  const dec = new TextDecoder();
  return dec.decode(buffer);
};

// Custom base64 URL-safe encoding/decoding
const base64UrlEncode = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  const binaryString = String.fromCodePoint(...bytes);
  return btoa(binaryString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const base64UrlDecode = (str) => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Key Derivation Function
const deriveKey = async (password, salt) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    strToArrayBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 200000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Download file helper
const downloadFile = (content, fileName, fileType) => {
  const blob = new Blob([content], { type: fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function App() {
  const [activeTab, setActiveTab] = useState("encrypt");
  const [encryptionFields, setEncryptionFields] = useState([
    { id: uuidv4(), plaintext: "", ciphertext: "" },
  ]);
  const [decryptionFields, setDecryptionFields] = useState([
    { id: uuidv4(), inputToken: "", decryptedText: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light") {
      setIsDarkMode(false);
    }
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? "bg-gray-950" : "bg-gray-50";
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const updateEncryptionField = (id, key, value) => {
    setEncryptionFields((prevFields) =>
      prevFields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      )
    );
  };

  const addEncryptionField = () => {
    setEncryptionFields((prevFields) => [
      ...prevFields,
      { id: uuidv4(), plaintext: "", ciphertext: "" },
    ]);
  };

  const removeEncryptionField = (id) => {
    setEncryptionFields((prevFields) =>
      prevFields.filter((field) => field.id !== id)
    );
  };

  const updateDecryptionField = (id, key, value) => {
    setDecryptionFields((prevFields) =>
      prevFields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      )
    );
  };

  const addDecryptionField = () => {
    setDecryptionFields((prevFields) => [
      ...prevFields,
      { id: uuidv4(), inputToken: "", decryptedText: "" },
    ]);
  };

  const removeDecryptionField = (id) => {
    setDecryptionFields((prevFields) =>
      prevFields.filter((field) => field.id !== id)
    );
  };

  const handleEncryptAll = async () => {
    if (encryptionFields.some((field) => !field.plaintext)) {
      toast.error("Please enter data in all fields to encrypt");
      return;
    }
    if (!secretKey) {
      toast.error("Please enter a secret key");
      return;
    }

    setIsLoading(true);

    try {
      const results = await Promise.all(
        encryptionFields.map(async (field) => {
          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const iv = window.crypto.getRandomValues(new Uint8Array(16));

          const aesKey = await deriveKey(secretKey, salt);

          const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-CBC", iv: iv },
            aesKey,
            strToArrayBuffer(field.plaintext)
          );

          const combined = new Uint8Array(
            salt.length + iv.length + encrypted.byteLength
          );
          combined.set(salt);
          combined.set(iv, salt.length);
          combined.set(new Uint8Array(encrypted), salt.length + iv.length);

          return { ...field, ciphertext: base64UrlEncode(combined.buffer) };
        })
      );
      setEncryptionFields(results);
      toast.success("Encryption successful!");
    } catch (error) {
      console.error("Encryption error:", error);
      toast.error("Encryption failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptAll = async () => {
    if (decryptionFields.some((field) => !field.inputToken)) {
      toast.error("Please enter encrypted tokens in all fields");
      return;
    }
    if (!secretKey) {
      toast.error("Please enter a secret key");
      return;
    }

    setIsLoading(true);

    try {
      const results = await Promise.all(
        decryptionFields.map(async (field) => {
          try {
            const decoded = base64UrlDecode(field.inputToken);
            const salt = decoded.slice(0, 16);
            const iv = decoded.slice(16, 32);
            const encryptedData = decoded.slice(32);

            const aesKey = await deriveKey(secretKey, salt);

            const decrypted = await window.crypto.subtle.decrypt(
              { name: "AES-CBC", iv: new Uint8Array(iv) },
              aesKey,
              encryptedData
            );

            return { ...field, decryptedText: arrayBufferToStr(decrypted) };
          } catch (error) {
            console.error("Decryption error for a field:", error);
            return {
              ...field,
              decryptedText: "Decryption failed. Invalid token or key.",
            };
          }
        })
      );
      setDecryptionFields(results);
      toast.success("Decryption successful!");
    } catch (error) {
      console.error("Decryption error:", error);
      toast.error("Decryption failed. Invalid token or key.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, message = "Copied to clipboard!") => {
    try {
      navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (e) {
      toast.error("Failed to copy to clipboard");
      console.error(e);
    }
  };

  const generateRandomKey = () => {
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const newKey = base64UrlEncode(randomBytes.buffer);
    setSecretKey(newKey);
    toast.success("New secure key generated");
  };

  const downloadKey = () => {
    if (!secretKey) {
      toast.error("No key to download");
      return;
    }
    downloadFile(secretKey, "aegis-secret-key.txt", "text/plain");
    toast.success("Key downloaded");
  };

  const downloadEncrypted = () => {
    const allCiphertexts = encryptionFields
      .map((f) => f.ciphertext)
      .join("\n\n---\n\n");
    if (!allCiphertexts) {
      toast.error("No encrypted data to download");
      return;
    }
    downloadFile(allCiphertexts, "aegis-encrypted-tokens.txt", "text/plain");
    toast.success("Encrypted tokens downloaded");
  };

  const downloadDecrypted = () => {
    const allDecryptedTexts = decryptionFields
      .map((f) => f.decryptedText)
      .join("\n\n---\n\n");
    if (!allDecryptedTexts) {
      toast.error("No decrypted data to download");
      return;
    }
    downloadFile(allDecryptedTexts, "aegis-decrypted-data.txt", "text/plain");
    toast.success("Decrypted data downloaded");
  };

  const scrollToTab = (tabId) => {
    setActiveTab(tabId);
    document.getElementById(tabId)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (activeTab === "encrypt") {
        const newFields = lines.map((line) => ({
          id: uuidv4(),
          plaintext: line,
          ciphertext: "",
        }));
        setEncryptionFields(newFields);
      } else {
        const newFields = lines.map((line) => ({
          id: uuidv4(),
          inputToken: line,
          decryptedText: "",
        }));
        setDecryptionFields(newFields);
      }
      toast.success(`Imported ${lines.length} items`);
    } catch (error) {
      toast.error("Failed to process file");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    },
    [activeTab]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text");
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (activeTab === "encrypt") {
        const newFields = lines.map((line) => ({
          id: uuidv4(),
          plaintext: line,
          ciphertext: "",
        }));
        setEncryptionFields((prev) => [...prev, ...newFields]);
      } else {
        const newFields = lines.map((line) => ({
          id: uuidv4(),
          inputToken: line,
          decryptedText: "",
        }));
        setDecryptionFields((prev) => [...prev, ...newFields]);
      }
      toast.success(`Added ${lines.length} items from clipboard`);
    },
    [activeTab]
  );

  const variants: any = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
  };

  const cardVariants: any = {
    initial: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.5 },
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <div
      className={`${
        isDarkMode ? "dark" : "light"
      } min-h-screen flex flex-col font-sans transition-colors duration-300`}
    >
      <Toaster
        position="top-center"
        richColors
        theme={isDarkMode ? "dark" : "light"}
      />

      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-800 p-2 sm:p-4 sticky top-0 z-50 backdrop-blur-sm bg-white/50 dark:bg-black/50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 sm:h-6 sm:w-6 text-black dark:text-white" />
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Aegis
              </h1>
            </div>
            <div className="hidden md:flex space-x-4">
              <Button
                variant="ghost"
                onClick={() => scrollToTab("encrypt")}
                className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
              >
                Encrypt
              </Button>
              <Button
                variant="ghost"
                onClick={() => scrollToTab("decrypt")}
                className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
              >
                Decrypt
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-white" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 hover:text-black" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card
            className={`${
              isDarkMode
                ? "bg-gray-900 border-gray-800 text-white"
                : "bg-white border-gray-200 text-black"
            } shadow-xl rounded-xl overflow-hidden`}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <motion.img
                  src="https://cdn-icons-png.flaticon.com/512/3063/3063187.png"
                  alt="Shield icon representing security"
                  className="h-20 w-20"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                />
              </div>
              <CardTitle className="text-3xl font-bold text-black dark:text-white">
                Aegis Encryption
              </CardTitle>
              <CardDescription
                className={`${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                } mt-2`}
              >
                Military-grade AES-256 encryption in your browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Secret Key Section */}
              <div className="mb-6 space-y-4">
                <Label
                  htmlFor="secret-key-input"
                  className={`${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Secret Key
                </Label>
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Input
                      id="secret-key-input"
                      type={showKey ? "text" : "password"}
                      placeholder="Enter your secret key"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className={`${
                        isDarkMode
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-gray-100 border-gray-300 text-gray-800"
                      } pr-16`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                        className="h-8 w-8 text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        {showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(secretKey, "Key copied to clipboard")
                        }
                        disabled={!secretKey}
                        className="h-8 w-8 text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={generateRandomKey}
                      variant="outline"
                      className="text-black dark:text-white border-black dark:border-white hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                      <RotateCw className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </motion.div>
                </div>
                {secretKey && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadKey}
                      className="text-black dark:text-white hover:underline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Key
                    </Button>
                  </motion.div>
                )}
              </div>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mt-6"
              >
                <TabsList
                  className={`grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800`}
                >
                  <TabsTrigger
                    value="encrypt"
                    id="encrypt"
                    className={`data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm
                                 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white transition-all duration-200`}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Encrypt
                  </TabsTrigger>
                  <TabsTrigger
                    value="decrypt"
                    id="decrypt"
                    className={`data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm
                                 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white transition-all duration-200`}
                  >
                    <Unlock className="mr-2 h-4 w-4" /> Decrypt
                  </TabsTrigger>
                </TabsList>
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === "encrypt" && (
                      <motion.div
                        key="encrypt"
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <TabsContent value="encrypt" className="mt-6">
                          <div className="space-y-4">
                            <AnimatePresence>
                              {encryptionFields.map((field, index) => (
                                <motion.div
                                  key={field.id}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  variants={variants}
                                  className="space-y-2 border p-4 rounded-md dark:border-gray-700"
                                >
                                  <div className="flex justify-between items-center">
                                    <Label
                                      htmlFor={`plaintext-${field.id}`}
                                      className={`${
                                        isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      Data to Encrypt {index + 1}
                                    </Label>
                                    {encryptionFields.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          removeEncryptionField(field.id)
                                        }
                                        className="h-8 w-8 text-gray-500 hover:text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <Textarea
                                    id={`plaintext-${field.id}`}
                                    placeholder="Enter sensitive data here..."
                                    value={field.plaintext}
                                    onChange={(e) =>
                                      updateEncryptionField(
                                        field.id,
                                        "plaintext",
                                        e.target.value
                                      )
                                    }
                                    className={`${
                                      isDarkMode
                                        ? "bg-gray-800 border-gray-700 text-white"
                                        : "bg-gray-100 border-gray-300 text-gray-800"
                                    } min-h-[120px]`}
                                  />
                                  {field.ciphertext && (
                                    <div className="space-y-2 mt-4">
                                      <Label
                                        htmlFor={`ciphertext-${field.id}`}
                                        className={`${
                                          isDarkMode
                                            ? "text-gray-300"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        Encrypted Token {index + 1}
                                      </Label>
                                      <div className="relative">
                                        <Textarea
                                          id={`ciphertext-${field.id}`}
                                          readOnly
                                          value={field.ciphertext}
                                          className={`${
                                            isDarkMode
                                              ? "bg-gray-800 border-gray-700 text-gray-300"
                                              : "bg-gray-100 border-gray-300 text-gray-700"
                                          } font-mono text-sm min-h-[100px]`}
                                        />
                                        <div className="absolute top-2 right-2 flex space-x-1">
                                          <Button
                                            onClick={() =>
                                              copyToClipboard(
                                                field.ciphertext,
                                                `Encrypted token ${
                                                  index + 1
                                                } copied`
                                              )
                                            }
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-black dark:hover:text-white"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            <div className="flex justify-end space-x-2">
                              <Button
                                onClick={addEncryptionField}
                                variant="outline"
                                className="text-black dark:text-white border-black dark:border-white hover:bg-gray-200 dark:hover:bg-gray-800 text-xs sm:text-sm p-2 sm:p-4"
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">
                                  Add Another
                                </span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                              <Button
                                onClick={downloadEncrypted}
                                disabled={encryptionFields.every(
                                  (f) => !f.ciphertext
                                )}
                                variant="outline"
                                className="text-black dark:text-white border-black dark:border-white hover:bg-gray-200 dark:hover:bg-gray-800"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download All
                              </Button>
                            </div>
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                onClick={handleEncryptAll}
                                disabled={
                                  isLoading ||
                                  !secretKey ||
                                  encryptionFields.every((f) => !f.plaintext)
                                }
                                className="w-full bg-black text-white dark:bg-white dark:text-black shadow-md"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Encrypting...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Encrypt All
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </div>
                        </TabsContent>
                      </motion.div>
                    )}
                    {activeTab === "decrypt" && (
                      <motion.div
                        key="decrypt"
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <TabsContent value="decrypt" className="mt-6">
                          <div className="space-y-4">
                            <AnimatePresence>
                              {decryptionFields.map((field, index) => (
                                <motion.div
                                  key={field.id}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  variants={variants}
                                  className="space-y-2 border p-4 rounded-md dark:border-gray-700"
                                >
                                  <div className="flex justify-between items-center">
                                    <Label
                                      htmlFor={`inputToken-${field.id}`}
                                      className={`${
                                        isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      Encrypted Token {index + 1}
                                    </Label>
                                    {decryptionFields.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          removeDecryptionField(field.id)
                                        }
                                        className="h-8 w-8 text-gray-500 hover:text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <Textarea
                                    id={`inputToken-${field.id}`}
                                    placeholder="Paste encrypted token here..."
                                    value={field.inputToken}
                                    onChange={(e) =>
                                      updateDecryptionField(
                                        field.id,
                                        "inputToken",
                                        e.target.value
                                      )
                                    }
                                    className={`${
                                      isDarkMode
                                        ? "bg-gray-800 border-gray-700 text-white"
                                        : "bg-gray-100 border-gray-300 text-gray-800"
                                    } min-h-[120px]`}
                                  />
                                  {field.decryptedText && (
                                    <div className="space-y-2 mt-4">
                                      <Label
                                        htmlFor={`decryptedText-${field.id}`}
                                        className={`${
                                          isDarkMode
                                            ? "text-gray-300"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        Decrypted Data {index + 1}
                                      </Label>
                                      <div className="relative">
                                        <Textarea
                                          id={`decryptedText-${field.id}`}
                                          readOnly
                                          value={field.decryptedText}
                                          className={`${
                                            isDarkMode
                                              ? "bg-gray-800 border-gray-700 text-gray-300"
                                              : "bg-gray-100 border-gray-300 text-gray-700"
                                          } min-h-[100px]`}
                                        />
                                        <div className="absolute top-2 right-2 flex space-x-1">
                                          <Button
                                            onClick={() =>
                                              copyToClipboard(
                                                field.decryptedText,
                                                `Decrypted data ${
                                                  index + 1
                                                } copied`
                                              )
                                            }
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-black dark:hover:text-white"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            <div className="flex justify-end space-x-2">
                              <Button
                                onClick={addDecryptionField}
                                variant="outline"
                                className="text-black dark:text-white border-black dark:border-white hover:bg-gray-200 dark:hover:bg-gray-800 text-xs sm:text-sm p-2 sm:p-4"
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">
                                  Add Another
                                </span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                              <Button
                                onClick={downloadDecrypted}
                                disabled={decryptionFields.every(
                                  (f) => !f.decryptedText
                                )}
                                variant="outline"
                                className="text-black dark:text-white border-black dark:border-white hover:bg-gray-200 dark:hover:bg-gray-800"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download All
                              </Button>
                            </div>
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                onClick={handleDecryptAll}
                                disabled={
                                  isLoading ||
                                  !secretKey ||
                                  decryptionFields.every((f) => !f.inputToken)
                                }
                                className="w-full bg-black text-white dark:bg-white dark:text-black shadow-md"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Decrypting...
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Decrypt All
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </div>
                        </TabsContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>

              {/* File Upload and Sample Format Section */}
              <div className="mb-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-4 mt-4 p-4 w-full sm:w-auto"
                    >
                      <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">
                        View Sample Format
                      </span>
                      <span className="sm:hidden">Sample</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {activeTab === "encrypt" ? "Encryption" : "Decryption"}{" "}
                        File Format
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Each line will be treated as a separate item to{" "}
                        {activeTab}:
                      </p>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm">
                        {activeTab === "encrypt"
                          ? "Sensitive data 1\nSensitive data 2\nSensitive data 3"
                          : "encrypted-token-1\nencrypted-token-2\nencrypted-token-3"}
                      </pre>
                    </div>
                  </DialogContent>
                </Dialog>

                <div
                  className={`mt-4 border-2 border-dashed rounded-lg p-4 sm:p-8 text-center ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 dark:border-gray-700"
                  } transition-colors`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                >
                  <input
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileUpload(e.target.files[0])
                    }
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 mb-2 text-gray-400" />
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span className="hidden sm:inline">
                        Drag & drop a file here,{" "}
                      </span>
                      <span className="text-blue-500">browse</span>
                      <span className="hidden sm:inline">
                        , or paste content
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 hidden sm:block">
                      Supports TXT and CSV files
                    </p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="container mx-auto">
          <p>
            &copy; {new Date().getFullYear()} Aegis by GamicGo. All rights
            reserved.
          </p>
          <p className="mt-1">
            <a
              href="https://www.gamicgo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black dark:hover:text-white underline"
            >
              Visit GamicGo
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
