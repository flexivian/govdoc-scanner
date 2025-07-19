import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Automated Document Crawling",
    Svg: require("@site/static/img/crawler.png").default,
    description: (
      <>
        Efficiently crawls the Greek GEMI portal to find and download all public
        documents for any company, ensuring you have the most up-to-date
        information.
      </>
    ),
  },
  {
    title: "AI-Powered Extraction",
    Svg: require("@site/static/img/ai.png").default,
    description: (
      <>
        Leverages Google Gemini's advanced generative AI to accurately extract
        structured metadata and contextual document histories from various file
        formats.
      </>
    ),
  },
  {
    title: "Structured & Searchable Data",
    Svg: require("@site/static/img/struct.png").default,
    description: (
      <>
        Organizes extracted data into a searchable format, making it easy to
        query and analyze corporate information through a REST API.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <img src={Svg} className={styles.featureSvg} role="img" alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
