// generador/skeleton.js
const toArtifact = (s) =>
  (s || "app")
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "-"); // espacios -> '-', solo [a-z0-9._-]

const toPascal = (s) =>
  (s || "App")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

const groupIdFromPackage = (pkg) => {
  // usa los 2 primeros segmentos como groupId; si hay 1, usa ese
  const parts = (pkg || "com.example").split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return pkg || "com.example";
};

const pkgToPath = (pkg) => (pkg || "com.example").replace(/\./g, "/");

export function makeSkeleton(projectName, packageBase) {
  const artifactId = toArtifact(projectName);
  const appClass = `${toPascal(projectName)}Application`;
  const groupId = groupIdFromPackage(packageBase);
  const pkgPath = pkgToPath(packageBase);

  const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.0-SNAPSHOT</version>
    <relativePath/>
  </parent>

  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>${artifactId}</name>
  <description>${projectName}</description>

  <properties>
    <java.version>21</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jdbc</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <scope>runtime</scope>
    </dependency>

    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>

    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
          <annotationProcessorPaths>
            <path>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </path>
          </annotationProcessorPaths>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>
    </plugins>
  </build>

  <repositories>
    <repository>
      <id>spring-milestones</id>
      <name>Spring Milestones</name>
      <url>https://repo.spring.io/milestone</url>
      <snapshots><enabled>false</enabled></snapshots>
    </repository>
    <repository>
      <id>spring-snapshots</id>
      <name>Spring Snapshots</name>
      <url>https://repo.spring.io/snapshot</url>
      <releases><enabled>false</enabled></releases>
    </repository>
  </repositories>

  <pluginRepositories>
    <pluginRepository>
      <id>spring-milestones</id>
      <name>Spring Milestones</name>
      <url>https://repo.spring.io/milestone</url>
      <snapshots><enabled>false</enabled></snapshots>
    </pluginRepository>
    <pluginRepository>
      <id>spring-snapshots</id>
      <name>Spring Snapshots</name>
      <url>https://repo.spring.io/snapshot</url>
      <releases><enabled>false</enabled></releases>
    </pluginRepository>
  </pluginRepositories>
</project>
`;

  const application = `package ${packageBase};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class ${appClass} {
  public static void main(String[] args) {
    try {
      SpringApplication.run(${appClass}.class, args);
    } catch (Exception e) {
      System.err.println("❌ Error al iniciar la aplicación:");
      System.err.println("➡️ " + e.getClass().getSimpleName() + ": " + e.getMessage());
      if (e.getStackTrace().length > 0) {
        StackTraceElement loc = e.getStackTrace()[0];
        System.err.println("📍 Ubicación: " + loc.getClassName() + " (línea " + loc.getLineNumber() + ")");
      }
      e.printStackTrace();
    }
  }

  @EventListener(ApplicationReadyEvent.class)
  public void onReady() {
    System.out.println("✅ ¡La aplicación ${projectName} se inició correctamente!");
    System.out.println("🌐 Accede a: http://localhost:8080");
  }
}
`;

  const props = `spring.application.name=${projectName}

# Configuración MySQL (edítala a tu entorno)
spring.datasource.url=jdbc:mysql://localhost:3306/${toArtifact(projectName)}
spring.datasource.username=root
spring.datasource.password= tu password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
`;

  return {
    "pom.xml": pom,
    [`src/main/java/${pkgPath}/${appClass}.java`]: application,
    "src/main/resources/application.properties": props,
  };
}
