"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";

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
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [generatedKey, setGeneratedKey] = useState("");
  const [showKey, setShowKey] = useState(false);

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

  const handleEncrypt = async () => {
    if (!plaintext) {
      toast.error("Please enter data to encrypt");
      return;
    }
    if (!secretKey) {
      toast.error("Please enter a secret key");
      return;
    }

    setIsLoading(true);
    setCiphertext("");

    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(16));

      const aesKey = await deriveKey(secretKey, salt);

      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv: iv },
        aesKey,
        strToArrayBuffer(plaintext)
      );

      const combined = new Uint8Array(
        salt.length + iv.length + encrypted.byteLength
      );
      combined.set(salt);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      const encryptedResult = base64UrlEncode(combined.buffer);
      setCiphertext(encryptedResult);
      toast.success("Encryption successful!");
    } catch (error) {
      console.error("Encryption error:", error);
      toast.error("Encryption failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!inputToken) {
      toast.error("Please enter an encrypted token");
      return;
    }
    if (!secretKey) {
      toast.error("Please enter a secret key");
      return;
    }

    setIsLoading(true);
    setDecryptedText("");

    try {
      const decoded = base64UrlDecode(inputToken);
      const salt = decoded.slice(0, 16);
      const iv = decoded.slice(16, 32);
      const encryptedData = decoded.slice(32);

      const aesKey = await deriveKey(secretKey, salt);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv: new Uint8Array(iv) },
        aesKey,
        encryptedData
      );

      const decryptedResult = arrayBufferToStr(decrypted);
      setDecryptedText(decryptedResult);
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
    setGeneratedKey(newKey);
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
    if (!ciphertext) {
      toast.error("No encrypted data to download");
      return;
    }
    downloadFile(ciphertext, "aegis-encrypted-token.txt", "text/plain");
    toast.success("Encrypted token downloaded");
  };

  const downloadDecrypted = () => {
    if (!decryptedText) {
      toast.error("No decrypted data to download");
      return;
    }
    downloadFile(decryptedText, "aegis-decrypted-data.txt", "text/plain");
    toast.success("Decrypted data downloaded");
  };

  const scrollToTab = (tabId) => {
    setActiveTab(tabId);
    document.getElementById(tabId)?.scrollIntoView({ behavior: "smooth" });
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
      <nav className="border-b border-gray-800 p-4 sticky top-0 z-50 backdrop-blur-sm bg-white/5 dark:bg-black/5">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Key className="h-6 w-6 text-indigo-500" />
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                Aegis
              </h1>
              {/* <span className="text-sm opacity-80">by GamicGo</span> */}
            </div>
            <div className="hidden md:flex space-x-4">
              <Button
                variant="ghost"
                onClick={() => scrollToTab("encrypt")}
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
              >
                Encrypt
              </Button>
              <Button
                variant="ghost"
                onClick={() => scrollToTab("decrypt")}
                className="text-gray-700 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400"
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
                <Sun className="h-5 w-5 text-yellow-300" />
              ) : (
                <Moon className="h-5 w-5 text-gray-800" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://www.gamicgo.xyz", "_blank")}
              className="border-indigo-500 text-indigo-500 hover:bg-indigo-500/10"
            >
              Visit GamicGo
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
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
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
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
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
                        className="h-8 w-8"
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
                        className="h-8 w-8"
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
                      variant="secondary"
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
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
                      className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
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
                  className={`grid w-full grid-cols-2 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  <TabsTrigger
                    value="encrypt"
                    id="encrypt"
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200`}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Encrypt
                  </TabsTrigger>
                  <TabsTrigger
                    value="decrypt"
                    id="decrypt"
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200`}
                  >
                    <Unlock className="mr-2 h-4 w-4" /> Decrypt
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="encrypt" className="mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="plaintext"
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Data to Encrypt
                      </Label>
                      <Textarea
                        id="plaintext"
                        placeholder="Enter sensitive data here..."
                        value={plaintext}
                        onChange={(e) => setPlaintext(e.target.value)}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-800"
                        } min-h-[120px]`}
                      />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        onClick={handleEncrypt}
                        disabled={isLoading || !secretKey}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Encrypting...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Encrypt Data
                          </>
                        )}
                      </Button>
                    </motion.div>
                    {ciphertext && (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Label
                          htmlFor="ciphertext"
                          className={`${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Encrypted Token
                        </Label>
                        <div className="relative">
                          <Textarea
                            id="ciphertext"
                            readOnly
                            value={ciphertext}
                            className={`${
                              isDarkMode
                                ? "bg-gray-800 border-gray-700 text-purple-300"
                                : "bg-gray-100 border-gray-300 text-purple-700"
                            } font-mono text-sm min-h-[100px]`}
                          />
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <Button
                              onClick={() =>
                                copyToClipboard(
                                  ciphertext,
                                  "Encrypted token copied"
                                )
                              }
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={downloadEncrypted}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="decrypt" className="mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="inputToken"
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Encrypted Token
                      </Label>
                      <Textarea
                        id="inputToken"
                        placeholder="Paste encrypted token here..."
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-800"
                        } min-h-[120px]`}
                      />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        onClick={handleDecrypt}
                        disabled={isLoading || !secretKey}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Decrypt Token
                          </>
                        )}
                      </Button>
                    </motion.div>
                    {decryptedText && (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Label
                          htmlFor="decryptedText"
                          className={`${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Decrypted Data
                        </Label>
                        <div className="relative">
                          <Textarea
                            id="decryptedText"
                            readOnly
                            value={decryptedText}
                            className={`${
                              isDarkMode
                                ? "bg-gray-800 border-gray-700 text-green-300"
                                : "bg-gray-100 border-gray-300 text-green-700"
                            } min-h-[100px]`}
                          />
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <Button
                              onClick={() =>
                                copyToClipboard(
                                  decryptedText,
                                  "Decrypted data copied"
                                )
                              }
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={downloadDecrypted}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-gray-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
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
              className="hover:text-indigo-500 dark:hover:text-indigo-400 underline"
            >
              Visit GamicGo
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
