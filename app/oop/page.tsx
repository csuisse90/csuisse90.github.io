import type { Metadata } from "next";
import FramePage from "@/components/FramePage";

export const metadata: Metadata = { title: "Object-oriented programming" };

export default function Page() {
  return (
    <FramePage
      code="B3 · Object-oriented programming"
      title="Object-oriented programming"
      meta="B3"
      lede="Organising a program around the things it deals with, rather than around the steps it takes."
      intro="Once a program grows past a few hundred lines, keeping data and the operations on that data in the same place stops being a style preference and starts being the only way to keep it comprehensible."
      rows={[
        { term: "Classes & objects", body: "A class is the template; an object is one instance of it, with its own values." },
        { term: "Attributes & methods", body: "The data an object holds and the operations it can perform on itself." },
        { term: "Constructors", body: "Setting an object up in a valid state at the moment it is created." },
        { term: "Encapsulation", body: "Keeping internal state private and exposing a deliberate interface, so an object cannot be put into an invalid state from outside." },
        { term: "Inheritance", body: "A subclass taking on the attributes and methods of a parent, and extending or replacing them." },
        { term: "Polymorphism", body: "Different classes responding to the same call in their own way, so calling code need not know which it has." },
        { term: "Abstraction", body: "Exposing what an object does while hiding how it does it." },
        { term: "UML class diagrams", body: "Drawing classes, their members and the relationships between them." },
      ]}
    />
  );
}
