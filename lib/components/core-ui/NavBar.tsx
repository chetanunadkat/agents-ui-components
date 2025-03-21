import { twMerge } from "tailwind-merge";

// export function NavBar({ roottwMerge = "", children }) {
//   return <div className={twMerge("w-full", rootClassNames)}>{children}</div>;
// }

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

// const items = [
//   { name: 'Dashboard', href: '#', current: true },
//   { name: 'Team', href: '#', current: false },
//   { name: 'Projects', href: '#', current: false },
//   { name: 'Calendar', href: '#', current: false },
// ]

interface NavBarItem {
  title?: string;
  href?: string;
  current?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  children?: NavBarItem[];
  render?: React.ReactNode;
}

interface NavBarProps {
  items?: NavBarItem[];
  rootClassNames?: string;
  hideLogo?: boolean;
}

/**
 * Simple Navbar component
 */
export function NavBar({
  items = [],
  rootClassNames = "",
  hideLogo = false,
}: NavBarProps) {
  return (
    <Disclosure
      as="nav"
      className={twMerge("bg-white dark:bg-gray-800 shadow", rootClassNames)}
    >
      <div className="mx-auto max-w-7xl px-4 xl:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex h-10 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-start">
              {!hideLogo && (
                <a href="/">
                  <Logo classNames="h-7 dark:invert" />
                </a>
              )}
            </div>
            <div className="hidden xl:ml-6 xl:flex xl:space-x-8">
              <ul className="flex space-x-8">
                {items.map((item) => (
                  <li
                    key={item.title}
                    className={
                      item.children && item.children.length > 0
                        ? "group relative"
                        : ""
                    }
                  >
                    <a
                      href={
                        item.children && item.children.length > 0
                          ? "#"
                          : item.href
                      }
                      onClick={(e) => {
                        item?.onClick ? item.onClick(e) : null;
                      }}
                      className={twMerge(
                        "inline-flex items-center border-b-2 border-transparent px-1 py-1 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-200 cursor-pointer",
                        item.current
                          ? "border-blue-500 text-gray-900 dark:text-white"
                          : ""
                      )}
                      aria-current={item.current ? "page" : undefined}
                      title={item.title}
                    >
                      {item.render || item.title}
                    </a>
                    {item.children && item.children.length > 0 && (
                      <ul className="absolute left-0 mt-2 hidden group-hover:block bg-white dark:bg-gray-800 shadow-lg text-sm text-gray-500 z-50 w-[150px]">
                        {item.children.map((child) => (
                          <li key={child.title} className="cursor-pointer">
                            <a
                              href={child.href}
                              onClick={(e) => {
                                child?.onClick ? child.onClick(e) : null;
                              }}
                              className={twMerge(
                                "block py-2 pl-3 pr-4 text-sm text-gray-500 dark:text-gray-400  hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200",
                                child.current
                                  ? "border-blue-500 text-gray-900 dark:text-white border-b-2"
                                  : ""
                              )}
                              aria-current={child.current ? "page" : undefined}
                              title={child.title}
                            >
                              {child.render || child.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="hidden xl:ml-6 xl:flex xl:items-center">
            <button
              type="button"
              className="relative rounded-full bg-white dark:bg-gray-700 p-1 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
            </button>
          </div>
          <div className="-mr-2 flex items-center xl:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Menu
                aria-hidden="true"
                className="block h-6 w-6 group-data-[open]:hidden"
              />
              <X
                aria-hidden="true"
                className="hidden h-6 w-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="xl:hidden max-w-7xl px-4 xl:px-6">
        <div className="space-y-1 pb-3 pt-2">
          <ul>
            {items.map((item) => (
              <li
                key={item.title}
                className={
                  item.children && item.children.length > 0 ? "dropdown" : ""
                }
              >
                <DisclosureButton
                  as="a"
                  href={
                    item.children && item.children.length > 0 ? "#" : item.href
                  }
                  onClick={(e) => {
                    item?.onClick ? item.onClick(e) : null;
                  }}
                  className={twMerge(
                    "block border-l-4 border-transparent py-2 pl-3 pr-4 text-base text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200",
                    item.current
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "",
                    item.children && item.children.length > 0
                      ? "dropdown-toggle"
                      : ""
                  )}
                  title={item.title}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.render || item.title}
                </DisclosureButton>
                {item.children && item.children.length > 0 && (
                  <ul className="dropdown-menu">
                    {item.children.map((child) => (
                      <li key={child.title}>
                        <DisclosureButton
                          as="a"
                          href={child.href}
                          onClick={(e) => {
                            child?.onClick ? child.onClick(e) : null;
                          }}
                          className={twMerge(
                            "block py-2 pl-8 pr-4 text-base text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                          )}
                          aria-current={child.current ? "page" : undefined}
                          title={child.title}
                        >
                          {child.render || child.title}
                        </DisclosureButton>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
